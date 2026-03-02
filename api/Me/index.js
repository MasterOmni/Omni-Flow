module.exports = async function (context, req) {
  const userId =
    req.headers["x-ms-client-principal-id"] ||
    req.headers["x-ms-client-principal-name"] ||
    "local-dev-user";

  const name =
    req.headers["x-ms-client-principal-name"] || "Local Dev";

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { userId, name, role: "operative" },
  };
};
