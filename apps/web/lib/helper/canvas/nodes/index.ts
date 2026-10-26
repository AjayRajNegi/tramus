import type { BuiltInNode, Node, NodeTypes } from "@xyflow/react";
import { PositionLoggerNode } from "./PositionLoggerNode";

export type PositionLoggerNodeType = Node<
  {
    label?: string;
  },
  "position-logger"
>;

export type AppNode = BuiltInNode | PositionLoggerNodeType;

export const initialNodes: AppNode[] = [
  { data: { label: "wire" }, id: "a", position: { x: 0, y: 0 }, type: "input" },
  {
    data: { label: "drag me!" },
    id: "b",
    position: { x: -100, y: 100 },
    type: "position-logger",
  },
  { data: { label: "your ideas" }, id: "c", position: { x: 100, y: 100 } },
  {
    data: { label: "with React Flow" },
    id: "d",
    position: { x: 0, y: 200 },
    type: "output",
  },
];

export const nodeTypes = {
  "position-logger": PositionLoggerNode,
} satisfies NodeTypes;
