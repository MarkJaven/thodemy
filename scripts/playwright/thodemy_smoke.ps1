param(
  [string]$BaseUrl = $env:PW_BASE_URL
)

$ErrorActionPreference = "Stop"

if (-not $BaseUrl) {
  $BaseUrl = "http://localhost:5173"
}
$BaseUrl = $BaseUrl.TrimEnd("/")

$pwcli = Join-Path $env:USERPROFILE ".codex\skills\playwright\scripts\playwright_cli.sh"
if (-not (Test-Path $pwcli)) {
  throw "Playwright CLI wrapper not found at $pwcli"
}

function Invoke-PwCli {
  param([string[]]$Args)
  & bash $pwcli @Args
}

function Invoke-RunCode {
  param([string]$Code)
  Invoke-PwCli @("run-code", $Code)
}

function Use-Session {
  param([string]$Name)
  $env:PLAYWRIGHT_CLI_SESSION = $Name
}

function Assert-Credentials {
  param(
    [string]$Email,
    [string]$Password,
    [string]$RoleLabel
  )
  if (-not $Email -or -not $Password) {
    throw "Missing credentials for $RoleLabel. Set env vars before running."
  }
}

function Invoke-PublicSmoke {
  param(
    [string]$BaseUrl,
    [switch]$Headed
  )

  Use-Session "public"
  $openArgs = @("open", "$BaseUrl/")
  if ($Headed) { $openArgs += "--headed" }
  Invoke-PwCli $openArgs
  Invoke-PwCli @("resize", "1440", "900")

  $payload = @{
    expectedAlt = "Thodemy"
    screenshot = "landing.png"
  } | ConvertTo-Json -Compress

  $code = @"
const data = $payload;
await page.waitForLoadState('domcontentloaded');
await page.getByAltText(data.expectedAlt).first().waitFor({ timeout: 15000 });
await page.screenshot({ path: data.screenshot, fullPage: true });
"@

  Invoke-RunCode $code
  Invoke-PwCli @("close")
}

function Invoke-RoleSmoke {
  param(
    [string]$Session,
    [string]$Email,
    [string]$Password,
    [string]$ExpectedHeader,
    [string]$FallbackLabel,
    [string[]]$NavLabels,
    [string]$Screenshot,
    [switch]$HandleProfile,
    [string]$BaseUrl,
    [switch]$Headed
  )

  Assert-Credentials -Email $Email -Password $Password -RoleLabel $Session

  Use-Session $Session
  $openArgs = @("open", "$BaseUrl/auth/login")
  if ($Headed) { $openArgs += "--headed" }
  Invoke-PwCli $openArgs
  Invoke-PwCli @("resize", "1440", "900")

  $payload = @{
    baseUrl = $BaseUrl
    email = $Email
    password = $Password
    expectedHeader = $ExpectedHeader
    fallbackLabel = $FallbackLabel
    navLabels = $NavLabels
    screenshot = $Screenshot
    handleProfile = [bool]$HandleProfile
  } | ConvertTo-Json -Compress

  $code = @"
const data = $payload;
const baseUrl = (data.baseUrl || '').replace(/\/$/, '');
await page.goto(baseUrl + '/auth/login', { waitUntil: 'networkidle' });

const configuredError = page.getByText('Supabase is not configured', { exact: false });
if (await configuredError.count()) {
  throw new Error('Supabase is not configured on this environment.');
}

await page.locator('input[name="email"]').fill(data.email || '');
await page.locator('input[name="password"]').fill(data.password || '');
await page.getByRole('button', { name: /sign in/i }).click();

const expected = page.getByText(data.expectedHeader, { exact: false });

try {
  await expected.first().waitFor({ timeout: 20000 });
} catch (err) {
  if (data.fallbackLabel) {
    const fallback = page.getByRole('button', { name: new RegExp(data.fallbackLabel, 'i') });
    if (await fallback.count()) {
      await fallback.first().click();
      await expected.first().waitFor({ timeout: 20000 });
    } else {
      throw err;
    }
  } else {
    throw err;
  }
}

if (data.handleProfile) {
  const welcome = page.getByRole('heading', { name: /welcome to thodemy/i });
  if (await welcome.count()) {
    await welcome.first().waitFor();
    await page.getByRole('button', { name: /^continue$/i }).first().click();

    await page.getByPlaceholder('Enter your first name').fill('QA');
    await page.getByPlaceholder('Enter your last name').fill('User');
    await page.locator('select').first().selectOption('male');
    await page.locator('input[type="date"]').first().fill('1995-01-01');
    await page.getByRole('button', { name: /^continue$/i }).first().click();

    await page.getByPlaceholder('Enter your full address').fill('123 QA Street');
    await page.getByPlaceholder('Enter your company ID').fill('QA-0001');
    await page.getByRole('button', { name: /^continue$/i }).first().click();

    const onboardingDate = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(onboardingDate);
    await page.getByRole('button', { name: /^continue$/i }).first().click();

    await expected.first().waitFor({ timeout: 30000 });
  }
}

for (const label of data.navLabels || []) {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') });
  if (await btn.count()) {
    await btn.first().click();
    const heading = page.getByRole('heading', { name: new RegExp(label, 'i') });
    await heading.first().waitFor({ timeout: 15000 });
  }
}

await page.screenshot({ path: data.screenshot, fullPage: true });

const signOut = page.getByRole('button', { name: /sign out/i });
if (await signOut.count()) {
  await signOut.first().click();
}
await page.getByRole('button', { name: /sign in/i }).waitFor({ timeout: 20000 });
"@

  Invoke-RunCode $code
  Invoke-PwCli @("close")
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$artifactDir = Join-Path $repoRoot "output\playwright"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

$headed = $env:PW_HEADED -eq "1"

Push-Location $artifactDir
try {
  Invoke-PublicSmoke -BaseUrl $BaseUrl -Headed:$headed

  Invoke-RoleSmoke `
    -Session "user" `
    -Email $env:PW_USER_EMAIL `
    -Password $env:PW_USER_PASSWORD `
    -ExpectedHeader "Learner Home" `
    -FallbackLabel "Learner dashboard" `
    -NavLabels @("Overview", "Learning Path", "Quizzes", "Forms", "Requests", "Profile") `
    -Screenshot "user-dashboard.png" `
    -HandleProfile `
    -BaseUrl $BaseUrl `
    -Headed:$headed

  Invoke-RoleSmoke `
    -Session "admin" `
    -Email $env:PW_ADMIN_EMAIL `
    -Password $env:PW_ADMIN_PASSWORD `
    -ExpectedHeader "Admin Workspace" `
    -FallbackLabel "Admin console" `
    -NavLabels @("Overview", "Courses", "Learning Paths", "Topics", "Users", "Activity", "Quiz", "Forms") `
    -Screenshot "admin-dashboard.png" `
    -BaseUrl $BaseUrl `
    -Headed:$headed

  Invoke-RoleSmoke `
    -Session "superadmin" `
    -Email $env:PW_SUPERADMIN_EMAIL `
    -Password $env:PW_SUPERADMIN_PASSWORD `
    -ExpectedHeader "Superadmin Workspace" `
    -FallbackLabel "Super admin" `
    -NavLabels @("Overview", "Courses", "Learning Paths", "Topics", "Users", "Quiz", "Approvals", "Reports") `
    -Screenshot "superadmin-dashboard.png" `
    -BaseUrl $BaseUrl `
    -Headed:$headed
}
finally {
  Pop-Location
}
