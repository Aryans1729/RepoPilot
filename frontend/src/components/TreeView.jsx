import { useMemo, useState } from "react";

function iconFor(node) {
  if (node.type === "dir") return "▸";
  return node.textLike ? "∙" : "○";
}

export default function TreeView({ structure }) {
  const [open, setOpen] = useState(() => new Set(["."]));

  const root = useMemo(() => structure, [structure]);

  if (!root) return null;

  return (
    <div className="tree">
      <Node
        node={root}
        open={open}
        onToggle={(p) => {
          setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(p)) next.delete(p);
            else next.add(p);
            return next;
          });
        }}
      />
    </div>
  );
}

function Node({ node, open, onToggle, depth = 0 }) {
  const isDir = node.type === "dir";
  const isOpen = open.has(node.path);
  const pad = { paddingLeft: `${depth * 12}px` };

  return (
    <div>
      <div style={pad}>
        {isDir ? (
          <button onClick={() => onToggle(node.path)} title="Toggle folder">
            {isOpen ? "▾" : iconFor(node)} {node.name}
          </button>
        ) : (
          <span>
            {iconFor(node)} {node.name}
          </span>
        )}
      </div>

      {isDir && isOpen && node.children?.length ? (
        <div>
          {node.children.map((c) => (
            <Node
              key={`${c.type}:${c.path}`}
              node={c}
              open={open}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

