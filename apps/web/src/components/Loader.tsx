import { BrandMark } from "./AppLayout";

function Loader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-white" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-3">
        <BrandMark className="size-8 animate-pulse motion-reduce:animate-none" />
        <p className="text-xs text-neutral-500">Loading Firebook…</p>
      </div>
    </div>
  );
}

export default Loader;
