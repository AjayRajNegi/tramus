import { getAllUser } from "../actions/dal";

export default async function User() {
	const data = await getAllUser();
	return (
		<div>
			Hello
			<div>
				{data.map((d) => (
					<div key={d.id}>
						<p>{d.name}</p>
						<p>{d.email}</p>

						<div>
							{d.posts.map((post) => (
								<div key={post.id}>
									<p>{post.title}</p>
									<p>{post.content}</p>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
