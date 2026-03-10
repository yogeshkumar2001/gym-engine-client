export default function ErrorState({ message = 'Failed to load data.' }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-destructive">
      {message}
    </div>
  );
}
