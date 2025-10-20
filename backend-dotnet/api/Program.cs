using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
        });

builder.Services.AddDistributedMemoryCache();

const string CookieName = "sid";
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = CookieName;
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(1);

        options.Events = new CookieAuthenticationEvents
        {

            OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            },

            OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            },

        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();
app.UseForwardedHeaders();

var pathBase = Environment.GetEnvironmentVariable("ASPNETCORE_PATHBASE");
if (!string.IsNullOrEmpty(pathBase))
{
    app.UsePathBase(pathBase);
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// minimal endpoints
app.MapGet("/health", () => Results.Ok("Healthy"));

// simulate OTP login (nextjs flow)
app.MapPost("/auth/login/otp", async (HttpContext httpContext) =>
{
    var form = await httpContext.Request.ReadFormAsync();
    var phone = form["phone"].ToString();
    var otp = form["otp"].ToString();

    if (string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(otp))
    {
        phone = httpContext.Request.Query["phone"].ToString();
        otp = httpContext.Request.Query["otp"].ToString();
    }
    if (phone == "50412345678" && otp == "123456")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "user-001"),
            new Claim(ClaimTypes.Name, "John Doe"),
            new Claim(ClaimTypes.Role, "User"),
        };

        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(claimsIdentity);


        var authProperties = new AuthenticationProperties
        {
            IsPersistent = false,
            ExpiresUtc = DateTimeOffset.UtcNow.AddHours(1),
            AllowRefresh = true,
        };
        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            authProperties);
        return Results.Ok("Login successful");
    }
    return Results.Unauthorized();
});

app.MapPost("/auth/login/admin", async (HttpContext httpContext) =>
{
    var form = await httpContext.Request.ReadFormAsync();
    var email = form["email"].ToString();
    var password = form["password"].ToString();
    if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
    {
        email = httpContext.Request.Query["email"].ToString();
        password = httpContext.Request.Query["password"].ToString();
    }
    if (email == "admin@example.com" && password == "admin123")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "admin-001"),
            new Claim(ClaimTypes.Name, "Admin User"),
            new Claim(ClaimTypes.Role, "Admin"),
        };

        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(claimsIdentity);

        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = false,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(1),
                AllowRefresh = true,
            });
        return Results.Ok("Admin login successful");
    }

    return Results.Unauthorized();
});

// auth me, used to identify user from cookie
app.MapGet("/auth/me", (ClaimsPrincipal user) =>
{
    if (user.Identity != null && user.Identity.IsAuthenticated)
    {
        var name = user.Identity?.Name ?? "unknown";
        var role = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "unknown";
        var sub = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value ?? "unknown";

        return Results.Ok(new
        {
            authenticated = true,
            UserName = name,
            UserRole = role,
            UserId = sub
        });
    }
    return Results.Ok(new { authenticated = false });
});



app.MapPost("/auth/otp/logout", async (HttpContext httpContext) =>
{
    await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    httpContext.Response.Cookies.Delete(CookieName);
    return Results.Ok("Logout successful");
});

// admin only sample data (dashboard)

app.MapGet("/admin/applications", () =>
{
    var applications = new[]
    {
        new { Id = "app-001", Name = "Application One", Status = "Pending" },
        new { Id = "app-002", Name = "Application Two", Status = "Approved" },
        new { Id = "app-003", Name = "Application Three", Status = "Rejected" },
    };
    return Results.Ok(applications);
}).RequireAuthorization( policy => policy.RequireRole("Admin"));

app.Run();