"use client";

import {
  forwardRef,
  useMemo,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  addChild,
  addJoinedCondition,
  addNestedSection,
  addSibling,
  conditionSummary,
  createConditionNode,
  deleteFromTree,
  groupDepth,
  operatorJoiner,
  isConditionComplete,
  MAX_REVIEWED_GROUP_DEPTH,
  moveInTree,
  setGroupOperator,
  updateTree,
  type ReviewedConditionNode,
  type ReviewedGroupNode,
  type ReviewedOperator,
  type ReviewedRuleNode,
  type ReviewedRuleTree,
} from "@/lib/coursemap/requisite-conditions";
import { ConditionInlineEditor } from "@/components/admin/requisite-condition-fields";
import {
  AddJoinMenu,
  GroupOperatorMenu,
  operatorChipClass,
  RemoveButton,
  type ConditionActions,
} from "@/components/admin/requisite-rule-controls";

/**
 * React Flow checks a second after mount that its attribution is on the page
 * and warns in development when it is not. Coursemap is licensed to remove it,
 * so the check is muted rather than answered with a decoy element.
 */
let attributionWarningMuted = false;

function muteAttributionWarning() {
  if (attributionWarningMuted || process.env.NODE_ENV !== "development") return;
  attributionWarningMuted = true;
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    const [message] = args;
    if (
      typeof message === "string" &&
      (message.includes("you are hiding the attribution") ||
        message.includes("does not exist, it may have been removed"))
    ) {
      return;
    }
    warn(...args);
  };
}

muteAttributionWarning();

const START_NODE_WIDTH = 128;
const GROUP_NODE_WIDTH = 156;
const CONDITION_NODE_WIDTH = 420;
const GROUP_NODE_HEIGHT = 48;
const CONDITION_NODE_HEIGHT = 56;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 14;

function stopPanePan(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

const GraphButton = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    label: string;
    onClick?: () => void;
  } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-label" | "children" | "className" | "type"
  >
>(function GraphButton(
  { children, label, onClick, onPointerDown, ...rest },
  ref,
) {
  return (
    <button
      aria-label={label}
      className="nodrag nopan grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-zinc-600 outline-none hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-brand-500/20"
      onClick={onClick}
      ref={ref}
      type="button"
      {...rest}
      onPointerDown={(event) => {
        stopPanePan(event);
        onPointerDown?.(event);
      }}
    >
      {children}
    </button>
  );
});

type GroupData = {
  canEdit: boolean;
  canNest: boolean;
  canRemove: boolean;
  group: ReviewedGroupNode;
  isRoot: boolean;
  onAddFirst: () => void;
  onAnd: () => void;
  onNewSection: () => void;
  onOr: () => void;
  onOperator: (operator: ReviewedOperator, minimumCount?: number) => void;
  onRemove: () => void;
};

type JoinEdgeData = {
  canEdit: boolean;
  group: ReviewedGroupNode;
  onOperator: (operator: ReviewedOperator, minimumCount?: number) => void;
  showLabel: boolean;
};

type ConditionData = {
  actions: ConditionActions;
  canEdit: boolean;
  canNest: boolean;
  condition: ReviewedConditionNode;
  onAnd: () => void;
  onNewSection: () => void;
  onOr: () => void;
};

type GraphNode =
  Node<GroupData, "ruleGroup"> | Node<ConditionData, "condition">;
type GraphEdge = Edge<JoinEdgeData>;

const handleClasses =
  "!size-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0";

function JoinChip({
  canEdit,
  group,
  onOperator,
}: {
  canEdit: boolean;
  group: ReviewedGroupNode;
  onOperator: (operator: ReviewedOperator, minimumCount?: number) => void;
}) {
  const label = operatorJoiner(group);
  const chip = cn(
    "inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] font-semibold tracking-wide uppercase outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20",
    operatorChipClass(group.operator),
  );

  if (!canEdit) {
    return <span className={chip}>{label}</span>;
  }

  return (
    <GroupOperatorMenu group={group} onOperator={onOperator}>
      <button
        aria-label={`Join with ${label}. Change and or or.`}
        className={cn(chip, "nodrag nopan")}
        onPointerDown={stopPanePan}
        type="button"
      >
        {label}
        <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
      </button>
    </GroupOperatorMenu>
  );
}

function OperatorEdge({
  data,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<GraphEdge>) {
  const [edgePath] = getSmoothStepPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {data?.showLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${sourceX + 40}px, ${sourceY}px)`,
            }}
          >
            <JoinChip
              canEdit={data.canEdit}
              group={data.group}
              onOperator={data.onOperator}
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function GroupNode({ data }: NodeProps<Node<GroupData, "ruleGroup">>) {
  const empty = data.group.children.length === 0;
  const title = data.isRoot ? "Start" : operatorJoiner(data.group);

  return (
    <div className="nopan nodrag inline-flex w-max items-center gap-1 rounded-md border border-zinc-200 bg-white py-1.5 pr-1.5 pl-2.5">
      <Handle
        className={handleClasses}
        position={Position.Left}
        type="target"
      />
      {empty && data.canEdit ? (
        <button
          className="nodrag nopan inline-flex cursor-pointer items-center gap-2 rounded-md text-left text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20"
          onClick={data.onAddFirst}
          onPointerDown={stopPanePan}
          type="button"
        >
          Add condition
          <Plus aria-hidden="true" className="text-zinc-500" size={16} />
        </button>
      ) : (
        <>
          {data.isRoot ? (
            <span className="pr-1 text-sm font-semibold whitespace-nowrap">
              {title}
            </span>
          ) : data.canEdit ? (
            <JoinChip
              canEdit={data.canEdit}
              group={data.group}
              onOperator={data.onOperator}
            />
          ) : (
            <span className="text-sm font-semibold">{title}</span>
          )}
          {data.canEdit ? (
            <>
              <AddJoinMenu
                align="end"
                canNest={data.canNest}
                onAnd={data.onAnd}
                onNewSection={data.onNewSection}
                onOr={data.onOr}
              >
                <GraphButton label={`Add to ${title}`}>
                  <Plus aria-hidden="true" size={16} />
                </GraphButton>
              </AddJoinMenu>
              {data.canRemove ? (
                <RemoveButton
                  className="nodrag nopan size-9"
                  label={`Remove group: ${title}`}
                  onClick={data.onRemove}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}
      <Handle
        className={handleClasses}
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

function ConditionNode({ data }: NodeProps<Node<ConditionData, "condition">>) {
  const condition = data.condition;
  const complete = isConditionComplete(condition);
  const summary = conditionSummary(condition);

  return (
    <div
      className={cn(
        "nopan nodrag inline-flex w-max items-center gap-1 rounded-md border bg-white py-1.5 pr-1.5 pl-2.5",
        complete ? "border-zinc-200" : "border-amber-300",
      )}
    >
      <Handle
        className={handleClasses}
        position={Position.Left}
        type="target"
      />
      {data.canEdit ? (
        <span className="nodrag nopan nowheel inline-flex items-center gap-1">
          <ConditionInlineEditor
            condition={condition}
            onChange={data.actions.onChange}
            onKindChange={data.actions.onKindChange}
            singleLine
          />
        </span>
      ) : (
        <span className="text-sm whitespace-nowrap">{summary}</span>
      )}
      {data.canEdit ? (
        <>
          <AddJoinMenu
            align="end"
            canNest={data.canNest}
            onAnd={data.onAnd}
            onNewSection={data.onNewSection}
            onOr={data.onOr}
          >
            <GraphButton label={`Add after: ${summary}`}>
              <Plus aria-hidden="true" size={16} />
            </GraphButton>
          </AddJoinMenu>
          <RemoveButton
            className="nodrag nopan size-9"
            label={`Remove condition: ${summary}`}
            onClick={data.actions.onRemove}
          />
        </>
      ) : null}
      <Handle
        className={handleClasses}
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

const nodeTypes = {
  ruleGroup: GroupNode,
  condition: ConditionNode,
} satisfies NodeTypes;

const edgeTypes = {
  operator: OperatorEdge,
};

function nodeWidth(node: ReviewedRuleNode, isRoot: boolean) {
  if (node.type === "group") {
    return isRoot ? START_NODE_WIDTH : GROUP_NODE_WIDTH;
  }
  return CONDITION_NODE_WIDTH;
}

function nodeHeight(node: ReviewedRuleNode) {
  return node.type === "group" ? GROUP_NODE_HEIGHT : CONDITION_NODE_HEIGHT;
}

function subtreeHeight(node: ReviewedRuleNode): number {
  if (node.type === "condition" || node.children.length === 0) {
    return nodeHeight(node);
  }
  return node.children.reduce(
    (total, child, index) =>
      total + subtreeHeight(child) + (index === 0 ? 0 : VERTICAL_GAP),
    0,
  );
}

/** Lay each subtree out in its own horizontal band and centre the parent. */
function collectLayout(
  node: ReviewedRuleNode,
  x: number,
  bandTop: number,
  positions: Map<string, { x: number; y: number }>,
  isRoot: boolean,
) {
  const height = subtreeHeight(node);
  positions.set(node.id, { x, y: bandTop + (height - nodeHeight(node)) / 2 });
  if (node.type === "condition" || node.children.length === 0) return;
  let childTop = bandTop;
  const childX = x + nodeWidth(node, isRoot) + HORIZONTAL_GAP;
  for (const child of node.children) {
    collectLayout(child, childX, childTop, positions, false);
    childTop += subtreeHeight(child) + VERTICAL_GAP;
  }
}

function toFlow(
  tree: ReviewedRuleTree,
  canEdit: boolean,
  onChange: (tree: ReviewedRuleTree) => void,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const positions = new Map<string, { x: number; y: number }>();
  collectLayout(tree, 0, 0, positions, true);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  function walk(
    node: ReviewedRuleNode,
    parent: ReviewedGroupNode | null,
    childIndex: number,
  ) {
    const position = positions.get(node.id) ?? { x: 0, y: 0 };
    if (parent) {
      edges.push({
        id: `${parent.id}-${node.id}`,
        source: parent.id,
        target: node.id,
        type: "operator",
        style: { stroke: "#d4d4d8", strokeWidth: 1.5 },
        data: {
          canEdit,
          group: parent,
          showLabel: parent.id === tree.id && childIndex === 0,
          onOperator: (operator, minimumCount) =>
            onChange(setGroupOperator(tree, parent.id, operator, minimumCount)),
        },
      });
    }
    if (node.type === "group") {
      const depth = groupDepth(tree, node.id) ?? 1;
      const canNest = canEdit && depth < MAX_REVIEWED_GROUP_DEPTH;
      nodes.push({
        id: node.id,
        type: "ruleGroup",
        position,
        className: "nopan nodrag",
        draggable: false,
        selectable: false,
        data: {
          canEdit,
          canNest,
          canRemove: parent != null,
          group: node,
          isRoot: parent == null,
          onAddFirst: () =>
            onChange(addChild(tree, node.id, createConditionNode("course"))),
          onAnd: () => onChange(addJoinedCondition(tree, node.id, "all_of")),
          onNewSection: () => onChange(addNestedSection(tree, node.id)),
          onOr: () => onChange(addJoinedCondition(tree, node.id, "any_of")),
          onOperator: (operator, minimumCount) =>
            onChange(setGroupOperator(tree, node.id, operator, minimumCount)),
          onRemove: () => onChange(deleteFromTree(tree, node.id)),
        },
        style: { width: "max-content", height: "max-content" },
      });
      node.children.forEach((child, index) => walk(child, node, index));
      return;
    }
    const parentDepth = parent ? (groupDepth(tree, parent.id) ?? 1) : 1;
    const parentIdForJoin = parent?.id;
    nodes.push({
      id: node.id,
      type: "condition",
      position,
      className: "nopan nodrag",
      draggable: false,
      selectable: false,
      data: {
        canEdit,
        canNest: canEdit && parentDepth < MAX_REVIEWED_GROUP_DEPTH,
        condition: node,
        onAnd: () => {
          if (!parentIdForJoin) return;
          onChange(
            addSibling(
              setGroupOperator(tree, parentIdForJoin, "all_of"),
              node.id,
              createConditionNode("course"),
            ),
          );
        },
        onOr: () => {
          if (!parentIdForJoin) return;
          onChange(
            addSibling(
              setGroupOperator(tree, parentIdForJoin, "any_of"),
              node.id,
              createConditionNode("course"),
            ),
          );
        },
        onNewSection: () => {
          if (!parentIdForJoin) return;
          onChange(addNestedSection(tree, parentIdForJoin));
        },
        actions: {
          canNest: canEdit && parentDepth < MAX_REVIEWED_GROUP_DEPTH,
          onAddCondition: (kind) =>
            onChange(addSibling(tree, node.id, createConditionNode(kind))),
          onAddGroup: () =>
            onChange(addNestedSection(tree, parentIdForJoin ?? tree.id)),
          onChange: (next) => onChange(updateTree(tree, node.id, () => next)),
          onKindChange: (kind) =>
            onChange(
              updateTree(tree, node.id, () => ({
                type: "condition",
                id: node.id,
                kind,
              })),
            ),
          onRemove: () => onChange(deleteFromTree(tree, node.id)),
        },
      },
      style: { width: "max-content", height: "max-content" },
    });
  }

  walk(tree, null, 0);
  return { nodes, edges };
}

export function RequisiteRuleGraph({
  canEdit,
  onChange,
  tree,
}: {
  canEdit: boolean;
  onChange: (tree: ReviewedRuleTree) => void;
  tree: ReviewedRuleTree;
}) {
  const graph = useMemo(
    () => toFlow(tree, canEdit, onChange),
    [canEdit, onChange, tree],
  );

  function onConnect(connection: Connection) {
    if (!canEdit || !connection.source || !connection.target) return;
    onChange(moveInTree(tree, connection.target, connection.source));
  }

  return (
    <div className="h-[30rem] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/60">
      <ReactFlow
        deleteKeyCode={null}
        edges={graph.edges}
        edgesFocusable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={1.5}
        minZoom={0.4}
        nodes={graph.nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable
        elementsSelectable={false}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        // xyflow turns pointer-events off unless a node is selectable, draggable, or has a click handler.
        onNodeClick={() => undefined}
        panOnDrag
        panOnScroll
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
      >
        <Background
          color="#d4d4d8"
          gap={20}
          size={1.5}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  );
}
