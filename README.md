# Stage FX Designer

Plataforma para planejamento, programação e simulação visual de efeitos especiais
de shows: **Stage Editor** (onde) + **Timeline Engine** (quando) + **Simulation
Engine** (o quê) = Show Simulation.

Veja [`ARCHITECTURE.md`](./ARCHITECTURE.md) para a análise de arquitetura, o
modelo de dados, os stores e o mapa dos componentes.

## Rodando localmente

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de produção
npm run lint
```

Stack: React 19 + TypeScript + Vite + Zustand + IndexedDB (`idb-keyval`).
