export default function SuspenseFallback({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F1E7A]"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
