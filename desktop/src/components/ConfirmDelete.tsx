type Props = {
  label?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Inline confirm for delete.
 * Cancel stays on the right (same place as the original Delete button)
 * so a mistaken double-click hits Cancel instead of confirming.
 */
export default function ConfirmDelete({
  label = "Delete?",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <span className="confirm-delete">
      <span className="confirm-delete-label">{label}</span>
      <button className="btn sm danger" onClick={onConfirm}>
        Delete
      </button>
      <button className="btn sm" onClick={onCancel}>
        Cancel
      </button>
    </span>
  );
}
