import Link from 'next/link';
import CreatePageForm from './CreatePageForm';

export default function NewBuilderPagePage() {
  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="mb-10">
        <Link href="/admin/pages" className="text-sm font-medium text-text-muted hover:text-navy dark:hover:text-white transition-colors">
          ← Back to Visual Pages
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold text-navy dark:text-white tracking-tight">Create Visual Page</h1>
        <p className="mt-2 text-text-secondary font-medium">
          Name the page and pick its public address — the drag &amp; drop builder opens right after.
        </p>
      </div>
      <CreatePageForm />
    </div>
  );
}
