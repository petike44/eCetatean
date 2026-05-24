import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "eCetățean" }] }),
  component: () => <Navigate to="/home" replace />,
});
