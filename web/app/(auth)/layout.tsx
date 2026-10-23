export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden bg-linear-to-b from-[#fcfcfd] to-[#e8eaed] px-4 py-12">
      {/* Dot grid that fades out toward the edges. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(#b9bec6_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-size-[20px_20px]"
      />
      {children}
    </main>
  );
}
