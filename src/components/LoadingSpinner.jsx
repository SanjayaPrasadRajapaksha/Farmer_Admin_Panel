
function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-10 text-gray-700">
      <div
        className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-black animate-spin"
        role="status"
        aria-label={label}
      />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}

export default LoadingSpinner;
