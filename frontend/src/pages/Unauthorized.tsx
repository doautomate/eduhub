export function Unauthorized() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Please log in to continue
      </h1>
    </div>
  );
}

export default Unauthorized;
