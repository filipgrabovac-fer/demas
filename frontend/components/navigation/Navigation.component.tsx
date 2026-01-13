"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Navigation = () => {
	const pathname = usePathname();

	const navItems = [
		{ href: "/", label: "Upload Data" },
		{ href: "/data", label: "View All Data" },
	];

	return (
		<nav className="border-b border-border bg-background">
			<div className="container mx-auto max-w-7xl px-4 py-4 sm:px-6">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
					<div className="text-lg font-semibold">Data Enhancement</div>
					<div className="flex gap-2">
						{navItems.map((item) => {
							const isActive =
								pathname === item.href ||
								(item.href === "/data" && pathname.startsWith("/data/"));
							return (
								<Link key={item.href} href={item.href}>
									<Button
										variant={isActive ? "default" : "ghost"}
										className={cn(
											"transition-colors",
											isActive && "bg-primary text-primary-foreground",
										)}
									>
										{item.label}
									</Button>
								</Link>
							);
						})}
					</div>
				</div>
			</div>
		</nav>
	);
};
