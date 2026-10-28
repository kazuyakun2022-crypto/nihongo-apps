async function main() {
  // Login
  const loginRes = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ferry2026@gmail.com", password: "password123" }),
  });
  const loginData = await loginRes.json();
  console.log("Login status:", loginRes.status, "User:", loginData?.user?.displayName);
  const token = loginData?.accessToken;
  if (!token) {
    console.error("No token received, details:", loginData);
    return;
  }

  // Update avatar
  const dummyAvatar = "data:image/webp;base64,UklGRmYAAABXRUJQVlA4TFkAAAAvEAAQEDdg26685v1XqI2IEfv/j6xM61z9Bwi4f0BExP8T4Qf/3d8I58f96b/r/v2/4v6h/w1704H96X4r8d3wT0tB/7s/zN/6y/70v/7P/9W49l8=";
  const updateRes = await fetch("http://localhost:4000/api/auth/me/avatar", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ avatarUrl: dummyAvatar }),
  });
  const updateData = await updateRes.json();
  console.log("PUT /avatar status:", updateRes.status, "Avatar set:", Boolean(updateData?.user?.avatarUrl));

  // Get current user
  const meRes = await fetch("http://localhost:4000/api/auth/me", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const meData = await meRes.json();
  console.log("GET /me status:", meRes.status, "AvatarUrl in DB:", meData?.user?.avatarUrl ? "YES" : "NO");

  // Delete avatar
  const delRes = await fetch("http://localhost:4000/api/auth/me/avatar", {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const delData = await delRes.json();
  console.log("DELETE /avatar status:", delRes.status, "AvatarUrl after delete:", delData?.user?.avatarUrl);
}

main().catch(console.error);
