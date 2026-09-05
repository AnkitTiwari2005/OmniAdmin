import { AlertCircle } from 'lucide-react';

interface Props {
  workspaceName: string;
  envKey: string;
}

export function NotConfiguredCard({ workspaceName, envKey }: Props) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-lg">{workspaceName} Service Key Required</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        To view and manage data for <strong>{workspaceName}</strong>, add your Supabase service role key (<code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{envKey}</code>) to your environment settings.
      </p>
    </div>
  );
}
