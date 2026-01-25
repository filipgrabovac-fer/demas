import Cookies from "js-cookie";
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

export const baseApiUrl =
	typeof window !== "undefined" && window.location.origin.includes("localhost")
		? "http://localhost:8000"
		: typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:8000";

export const includeCookiesMiddleware: Middleware = {
	onRequest({ request }) {
		const csrfToken = Cookies.get("csrftoken");
		if (csrfToken) request.headers.set("X-CSRFToken", csrfToken);

		if (typeof window !== "undefined") {
			request.headers.set("Host", window.location.host);
		}

		return request;
	},
};

export const apiClientFetch = createClient<paths, "application/json">({
	baseUrl: baseApiUrl,
	querySerializer: {
		array: {
			style: "form",
			explode: false,
		},
	},
	credentials: "include",
});

apiClientFetch.use(includeCookiesMiddleware);
