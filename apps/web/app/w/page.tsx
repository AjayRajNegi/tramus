import { getAllUser } from "../../lib/actions/dal";

export default async function Home() {
  const data = await getAllUser();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 font-extrabold text-4xl text-gray-900">
          User Directory
        </h1>

        <div className="grid gap-8">
          {data.map((user) => (
            <div
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-md"
              key={user.id}
            >
              {/* User Header Info */}
              <div className="mb-6 border-b pb-4">
                <h2 className="font-bold text-2xl text-blue-600">
                  {user.name}
                </h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>

              {/* Posts Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">
                  Recent Posts
                </h3>
                <div className="grid gap-4">
                  {user.posts.map((post) => (
                    <div
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                      key={post.id}
                    >
                      <h4 className="mb-1 font-bold text-gray-800">
                        {post.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
