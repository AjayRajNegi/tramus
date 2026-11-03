import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { PositionLoggerNodeType } from ".";

export function PositionLoggerNode({
  positionAbsoluteX,
  positionAbsoluteY,
  data,
}: NodeProps<PositionLoggerNodeType>) {
  const x = `${Math.round(positionAbsoluteX)}px`;
  const y = `${Math.round(positionAbsoluteY)}px`;

  return (
    // We add this class to use the same styles as React Flow's default nodes.
    <div className="react-flow__node-default">
      {data.label && <div>{data.label}</div>}

      <div>
        {x} {y}
      </div>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}
