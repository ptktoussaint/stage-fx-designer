import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import { useSelectionStore } from '../stores/selectionStore';
import { DEFAULT_FIGURE_COLOR } from '../types';
import type { FigureDefinition, FigureInstance, Vector3 } from '../types';
import { createId, nextInstanceName } from '../utils/id';

export class AddFigureCommand implements Command {
  label: string;
  readonly figure: FigureInstance;

  constructor(definition: FigureDefinition, position: Vector3) {
    const existingNames = useProjectStore.getState().project.figures.map((f) => f.name);
    this.figure = {
      id: createId(),
      definitionId: definition.id,
      name: nextInstanceName(definition.namePrefix, existingNames),
      position,
      rotation: { z: 0 },
      locked: false,
      color: DEFAULT_FIGURE_COLOR,
    };
    this.label = `Adicionar ${this.figure.name}`;
  }

  execute() {
    useProjectStore.getState()._addFigure(this.figure);
  }

  undo() {
    useProjectStore.getState()._removeFigure(this.figure.id);
  }
}

export class RemoveFiguresCommand implements Command {
  label: string;
  private readonly figureIds: string[];
  private readonly prevFigures: FigureInstance[];

  constructor(figureIds: string[]) {
    this.figureIds = figureIds;
    this.prevFigures = useProjectStore.getState().project.figures;
    this.label = figureIds.length > 1 ? `Excluir ${figureIds.length} Cenários` : 'Excluir Cenário';
  }

  execute() {
    useProjectStore.getState()._removeFigures(this.figureIds);
    useSelectionStore.getState().clear();
  }

  undo() {
    const store = useProjectStore.getState();
    store._setProject({ ...store.project, figures: this.prevFigures });
  }
}

export class MoveFigureCommand implements Command {
  label: string;
  private readonly figureId: string;
  private readonly from: Vector3;
  private to: Vector3;

  constructor(figureId: string, from: Vector3, to: Vector3) {
    this.figureId = figureId;
    this.from = from;
    this.to = to;
    this.label = 'Mover Cenário';
  }

  execute() {
    useProjectStore.getState()._updateFigure(this.figureId, { position: this.to });
  }

  undo() {
    useProjectStore.getState()._updateFigure(this.figureId, { position: this.from });
  }

  mergeWith(next: Command): Command | null {
    if (!(next instanceof MoveFigureCommand) || next.figureId !== this.figureId) return null;
    return new MoveFigureCommand(this.figureId, this.from, next.to);
  }
}

export class UpdateFigureCommand implements Command {
  label: string;
  private readonly figureId: string;
  private readonly patchBefore: Partial<FigureInstance>;
  private readonly patchAfter: Partial<FigureInstance>;

  constructor(
    figureId: string,
    patchBefore: Partial<FigureInstance>,
    patchAfter: Partial<FigureInstance>,
    label = 'Editar Cenário',
  ) {
    this.figureId = figureId;
    this.patchBefore = patchBefore;
    this.patchAfter = patchAfter;
    this.label = label;
  }

  execute() {
    useProjectStore.getState()._updateFigure(this.figureId, this.patchAfter);
  }

  undo() {
    useProjectStore.getState()._updateFigure(this.figureId, this.patchBefore);
  }
}
