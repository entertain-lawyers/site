import LawyerFormClient from '../LawyerFormClient';

export const metadata = { title: 'Add Consultation Lawyer | Admin' };

export default function NewLawyerPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-navy dark:text-white tracking-tight">
          Add Certified Consultation Lawyer
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Create an official advocate profile available for client consultation booking.
        </p>
      </div>

      <LawyerFormClient />
    </div>
  );
}
