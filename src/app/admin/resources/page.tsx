import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Resources - Admin - Entertain Lawyers',
};

export default async function AdminResourcesPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const resources = await prisma.resource.findMany({
    include: {
      subject: {
        include: {
          semester: true
        }
      },
      document: true
    },
    orderBy: { title: 'asc' }
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Resources</h1>
            <p className="mt-1 text-sm text-gray-500">
              A list of all study materials, PDFs, and resources available on the platform.
            </p>
          </div>
          <Link
            href="/admin/resources/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#1a365d] hover:bg-[#2d4a7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a365d]"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Resource
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject & Semester</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Status</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resources.length > 0 ? (
                  resources.map((resource) => {
                    const typedResource = resource as any;
                    return (
                      <tr key={resource.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2 max-w-xs">{resource.title}</div>
                          <div className="text-xs text-gray-500 font-mono mt-1" title={resource.id}>ID: {resource.id.split('-')[0]}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{typedResource.subject?.name}</div>
                          <div className="text-sm text-gray-500">{typedResource.subject?.semester?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full mb-1 ${
                            resource.isPremium ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {resource.isPremium ? 'Premium' : 'Free'}
                          </span>
                          {resource.isPremium && resource.priceAmount && (
                            <div className="text-sm text-gray-500 mt-1">
                              {resource.currency} {(resource.priceAmount / 100).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {resource.documentId ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="-ml-0.5 mr-1.5 h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <svg className="-ml-0.5 mr-1.5 h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Pending Upload
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/resources/${resource.id}`} className="text-[#1a365d] hover:text-[#2d4a7a] mr-4">
                            View
                          </Link>
                          {/* More actions like Edit/Delete could go here */}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                      No resources found. Click "Add Resource" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
