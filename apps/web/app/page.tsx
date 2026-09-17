import { getAllUser } from "./actions/dal";

export default async function Home() {
	const data = await getAllUser();

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl font-extrabold text-gray-900 mb-8">
					User Directory
				</h1>

				<div className="grid gap-8">
					{data.map((user) => (
						<div
							key={user.id}
							className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
						>
							{/* User Header Info */}
							<div className="mb-6 border-b pb-4">
								<h2 className="text-2xl font-bold text-blue-600">
									{user.name}
								</h2>
								<p className="text-gray-500 text-sm">{user.email}</p>
							</div>

							{/* Posts Section */}
							<div className="space-y-4">
								<h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
									Recent Posts
								</h3>
								<div className="grid gap-4">
									{user.posts.map((post) => (
										<div
											key={post.id}
											className="p-4 bg-gray-50 rounded-lg border border-gray-100"
										>
											<h4 className="font-bold text-gray-800 mb-1">
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
