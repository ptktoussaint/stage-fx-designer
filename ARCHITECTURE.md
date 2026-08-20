# Stage FX Designer — Arquitetura

Este documento registra a análise da arquitetura proposta, os problemas identificados,
as melhorias adotadas, e mapeia onde cada peça (tipos, stores, engines, componentes)
vive no código. O objetivo desta fase foi construir uma **fundação escalável**, não
funcionalidades finais.

## 1. Análise e problemas identificados na proposta original

1. **"Salvar coordenadas em metros, converter só na renderização"** estava correto,
   mas a proposta não definia *onde* essa fronteira pixel↔metro deveria viver. Sem um
   módulo dedicado, cada componente acabaria fazendo sua própria conta de zoom — bugs
   de arredondamento e inconsistência entre Stage Editor, Timeline e um futuro 3D.
   → Resolvido com `src/engine/coordinates.ts` como única fronteira.

2. **Grupos e dispositivos formam um grafo bidirecional** (`Group.deviceIds` e
   `DeviceInstance.groupIds`), mas a proposta não dizia quem é a fonte da verdade.
   Deixar os dois lados divergirem é uma classe inteira de bugs (device apontando pra
   grupo que não existe mais, grupo com ids órfãos). → Resolvido concentrando toda
   escrita nesse grafo dentro de mutators atômicos do `projectStore`
   (`_removeGroup`, `_removeDevice(s)`) que sempre atualizam os dois lados juntos —
   nenhum Command manipula os dois arrays manualmente.

3. **Undo/Redo "para tudo desde o início"** é fácil de prometer e fácil de implementar
   errado. O risco concreto (e que realmente apareceu durante os testes desta fase):
   um Command cujo `undo()` reconstrói o projeto lendo `useProjectStore.getState()`
   uma vez no início da função e reusando esse snapshot *depois* de já ter chamado
   outro mutator — o snapshot fica stale e o `undo()` ressuscita dados que acabou de
   apagar. Ver comentário em `src/commands/groupCommands.ts` — é a documentação viva
   desse bug e da regra que o evita.

4. **Timeline controlando a simulação diretamente** foi explicitamente evitado pela
   proposta ("Timeline apenas edita dados"), mas isso só se sustenta se existir um
   único caminho de execução. Por isso o botão "Test Trigger" do Inspector (usado
   para testar um efeito sem precisar de um evento na timeline) **não chama o
   Simulation Engine diretamente** — ele emite o mesmo `SIMULATION_TRIGGER` que o
   Show Engine emite durante o playback. Um único caminho, duas origens.

5. **DeviceDefinition vs DeviceInstance** exigia decidir o que é *copiado* na criação
   (nome gerado, `customProperties` inicial) vs. o que é *referenciado* (a definição
   em si, via `definitionId`). Resolvido: a instância nunca duplica a definição
   inteira, só os parâmetros que o usuário pode individualmente sobrescrever.

## 2. Melhorias adotadas além do que foi pedido

- **Command Pattern em vez de State History** (seção 17 pedia para escolher). Motivo:
  o projeto vai crescer para muitos dispositivos + muitos eventos de timeline;
  snapshots de estado inteiro em cada drag seriam caros e não dão um rótulo
  semântico ("Undo Align Left") nem um jeito barato de mesclar frames de um drag
  contínuo em uma única entrada de undo. Ver `src/commands/Command.ts`.
- **Drag ao vivo sem poluir o undo stack**: durante um arraste (dispositivo na Stage
  ou evento na Timeline), a posição é escrita diretamente no `projectStore` via
  `_updateDevice`/`_updateTimelineEvent` (sem passar pelo Command) a cada frame, para
  feedback instantâneo; só no `pointerup` um único Command é despachado com
  posição inicial → final. É a única exceção documentada à regra "componentes nunca
  chamam métodos `_` do store diretamente".
- **Flush de autosave em `visibilitychange`/`pagehide`**, além do debounce — a
  seção 19 pede sobrevivência a fechamento acidental; um debounce puro pode perder
  os últimos ~800ms de edição se a aba fechar antes de disparar.
- **`erasableSyntaxOnly` do TypeScript** (já vinha configurado no template) proíbe
  `abstract class` e parâmetros de construtor (`constructor(private x: T)`). Isso
  mudou o desenho de `AlignDevicesCommand`/`DistributeDevicesCommand`, que usam
  composição (uma função `computeNext` injetada) em vez de uma base abstrata.

## 3. Modelo de dados (`src/types/`)

| Arquivo | Conteúdo |
|---|---|
| `geometry.ts` | `Vector3` (x=horizontal, y=profundidade, z=altura), `Rotation3` |
| `device.ts` | `DeviceDefinition`, `DeviceCategory`, `SimulationType`, `DeviceCapabilities` |
| `instance.ts` | `DeviceInstance` (referencia `definitionId`, nunca copia a definição) |
| `stage.ts` | `StageConfig` (width/depth/origin/gridSize, tudo em metros) |
| `group.ts` | `Group` |
| `timeline.ts` | `TimelineEvent` (tempo sempre em segundos decimais), `TimelineTargetType` |
| `project.ts` | `Project` raiz, `schemaVersion`, `ProjectSettings` (inclui snap e viewMode) |

## 4. Catálogo de dispositivos (`src/devices/`)

Nenhum equipamento é hardcoded em componente React. `definitions/*.ts` (um arquivo
por categoria: fire, co2, spark, pyro, atmospheric, confetti) exporta arrays de
`DeviceDefinition`; `registry.ts` os agrega e expõe `getDeviceDefinition(id)`,
`getDefinitionsByCategory(category)` e a ordem/labels das categorias. Adicionar um
novo modelo de máquina é adicionar uma entrada em um desses arquivos — zero mudança
em componentes.

## 5. Stores Zustand (`src/stores/`)

- **`projectStore`** — dono do `Project` inteiro (stage, devices, groups, audio,
  timeline, settings). Expõe mutators `_xxx` de baixo nível; **só `src/commands/`
  deve chamá-los**.
- **`selectionStore`** — seleção de dispositivos (single/multi/box), emite
  `SELECTION_CHANGED` no event bus.
- **`uiStore`** — estado de UI efêmero: zoom/pan da stage, larguras dos painéis,
  ferramenta ativa, menu de contexto, modal de stage settings. Nada aqui é
  persistido no projeto (é preferência de sessão, não dado do show).
- **`playbackStore`** — `currentTime`/`isPlaying` do transporte.
- **`historyStore`** — pilhas de undo/redo (`Command[]`), com merge de comandos
  consecutivos do mesmo tipo (usado pelo drag contínuo de dispositivo).

## 6. Command Pattern (`src/commands/`)

`Command.ts` define a interface (`execute`/`undo`/`mergeWith?`). Cada arquivo
implementa um domínio: `deviceCommands.ts` (add/remove/move/duplicate/update),
`groupCommands.ts` (group/ungroup/lock), `alignCommands.ts` (align/distribute),
`timelineCommands.ts` (add/update/remove evento). `commands/index.ts` é a **única
API pública** que componentes React devem importar (`addDevice`, `moveDevices`,
`alignDevices`, `undo`, `redo`, etc.) — ela decide como construir o Command e o
despacha via `historyStore.execute()`.

## 7. Motores (`src/engine/`)

- **`eventBus.ts`** — pub/sub tipado (`DEVICE_MOVED`, `SIMULATION_TRIGGER`,
  `PLAYHEAD_CHANGED`, etc.), o desacoplamento entre Timeline, Stage e Simulation.
- **`showEngine.ts`** — dado um `currentTime`, varre `TimelineEvent`s entre o
  último tick e o atual, resolve `targetType` (`device` vira `[deviceId]`, `group`
  vira `group.deviceIds`) e emite `SIMULATION_TRIGGER` por dispositivo. **Não sabe
  nada sobre renderização.**
- **`simulationEngine.ts`** — registro de handlers por `SimulationType`
  (`registerHandler`), chamado a partir do bus. Quem decide o efeito visual (2D
  hoje, 3D amanhã) registra seu próprio handler aqui — o motor não conhece
  renderer nenhum.
- **`coordinates.ts`** — única fronteira metros↔pixels do app.

Fluxo (seção 14 do briefing), como implementado:
`Timeline (edita TimelineEvent) → ShowEngine.tick(currentTime) → resolve device/group
→ eventBus.emit(SIMULATION_TRIGGER) → SimulationEngine.triggerEffect → handlers
registrados pelo renderer ativo`. O botão manual "Test Trigger" do Inspector entra
no mesmo fluxo emitindo o mesmo evento, sem atalho direto ao motor.

## 8. Componentes (`src/components/`)

```
layout/       AppShell, TopToolbar, LeftSidebar, CenterWorkspace, RightInspector,
              BottomTimelinePanel, AppContextMenu — só orquestram, sem lógica de domínio
fxLibrary/    FxLibraryPanel — 100% orientado pelo registry de devices
stage/        StageEditor → StageRenderer2D (SVG, metros→pixels, drag, box-select,
              snap, bounding box, distance overlay) / StageRenderer3D (placeholder)
inspector/    InspectorPanel decide entre StageSettingsForm (nada selecionado),
              DevicePropertiesPanel (1 selecionado) e MultiSelectToolsPanel (vários)
timeline/     TimelinePanel, TimelineRuler, TimelineTrack, TimelineEventBlock
common/       Icon, IconButton, NumberField, Modal, ContextMenu, ResizeHandle
```

`StageRenderer2D` e um futuro `StageRenderer3D` (via react-three-fiber, por
exemplo) leem o **mesmo** `DeviceInstance[]` — nada no modelo de dados é
específico de 2D. `DeviceInstance.position.z` e `rotation.pitch/roll` já existem
hoje sem uso no 2D, prontos para o 3D.

## 9. Persistência (`src/persistence/`, `src/hooks/useAutosave.ts`)

IndexedDB via `idb-keyval` (não localStorage — projetos vão crescer além do limite
síncrono de ~5MB, e blobs de áudio virão depois). `schema.ts` carrega
`schemaVersion` e tem o esqueleto de migração incremental (`case N: ... version =
N+1`) para quando o formato do `Project` mudar. Autosave roda em debounce de 800ms
mais um flush imediato em `visibilitychange`/`pagehide`.

## 10. Como testar localmente

```
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # typecheck + build de produção
npm run lint     # oxlint
```

## 11. Fora de escopo nesta fase (conforme pedido)

DMX/controle físico, disparo real de hardware, protocolos proprietários, IA
musical, efeitos fisicamente precisos. O `SimulationEngine.triggerEffect` e o
`StageRenderer3D` são os pontos de extensão previstos para quando essas features
entrarem em pauta.
