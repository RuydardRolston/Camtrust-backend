<#
.SYNOPSIS
CamTrust API Testing Script
Run this script to test authentication, projects, assignments, reports, and notifications.
#>

$baseUrl = "http://localhost:4000/api"
$headers = @{ "Content-Type" = "application/json" }

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [string]$Token
    )
    
    $reqHeaders = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $reqHeaders["Authorization"] = "Bearer $Token"
    }
    
    $bodyJson = $null
    if ($Body) {
        $bodyJson = $Body | ConvertTo-Json -Depth 10
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$Path" -Method $Method -Headers $reqHeaders -Body $bodyJson
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorBody)
        $errorText = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "  ERROR $statusCode : $errorText" -ForegroundColor Red
        return @{ success = $false; message = "HTTP $statusCode"; error = $errorText }
    }
}

function Show-Result($name, $result) {
    if ($result.success -eq $true -or $result.token -or $result.project -or $result.assignment -or $result.notifications) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "  [FAIL] $name : $($result.message)" -ForegroundColor Red
        return $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CamTrust API Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# ============================================
# 1. AUTHENTICATION TESTS
# ============================================
Write-Host "[1] AUTHENTICATION TESTS" -ForegroundColor Yellow

Write-Host "  Testing Owner Signup..." -ForegroundColor Gray
$ownerEmail = "test.owner.$(Get-Random -Minimum 1000 -Maximum 9999)@camtrust.test"
$signupBody = @{
    fullName = "API Test Owner"
    email = $ownerEmail
    password = "owner123"
    confirmPassword = "owner123"
    role = "property_owner"
} | ConvertTo-Json

$signupResult = Invoke-Api -Method Post -Path "/users/signup" -Body $signupBody
if (-not (Show-Result "Owner Signup" $signupResult)) { $allPassed = $false }

if ($signupResult.token) {
    $ownerToken = $signupResult.token
    Write-Host "  Owner Token: $($ownerToken.Substring(0, [Math]::Min(40, $ownerToken.Length)))..." -ForegroundColor DarkGray
    
    Write-Host "  Testing Owner Login..." -ForegroundColor Gray
    $loginBody = @{
        email = $ownerEmail
        password = "owner123"
    } | ConvertTo-Json
    $loginResult = Invoke-Api -Method Post -Path "/users/login" -Body $loginBody
    if (-not (Show-Result "Owner Login" $loginResult)) { $allPassed = $false }
    if ($loginResult.token) { $ownerToken = $loginResult.token }
}
else {
    Write-Host "  [SKIP] Owner Login - Signup failed" -ForegroundColor Yellow
    $ownerToken = $null
    $allPassed = $false
}

Write-Host "  Testing Admin Login..." -ForegroundColor Gray
$adminBody = @{
    email = "admin@camtrust.com"
    password = "admin123"
} | ConvertTo-Json
$adminResult = Invoke-Api -Method Post -Path "/users/login" -Body $adminBody
if (-not (Show-Result "Admin Login" $adminResult)) { $allPassed = $false }
if ($adminResult.token) { $adminToken = $adminResult.token } else { $adminToken = $null; $allPassed = $false }

Write-Host "  Testing Engineer Login..." -ForegroundColor Gray
$engBody = @{
    email = "engineer@camtrust.com"
    password = "engineer123"
} | ConvertTo-Json
$engResult = Invoke-Api -Method Post -Path "/users/login" -Body $engBody
if (-not (Show-Result "Engineer Login" $engResult)) { $allPassed = $false }
if ($engResult.token) { $engineerToken = $engResult.token } else { $engineerToken = $null; $allPassed = $false }

Write-Host ""

# ============================================
# 2. PROJECT CREATION & APPROVAL
# ============================================
Write-Host "[2] PROJECT CREATION & APPROVAL" -ForegroundColor Yellow

if ($ownerToken -and $adminToken) {
    Write-Host "  Creating Project..." -ForegroundColor Gray
    $projectBody = @{
        title = "API Test Project $(Get-Date -Format 'HHmmss')"
        location = "Test Location"
        description = "Test Description"
        budget = "100000"
        startDate = "2025-01-01"
    } | ConvertTo-Json
    $projectResult = Invoke-Api -Method Post -Path "/projects/create" -Body $projectBody -Token $ownerToken
    if (-not (Show-Result "Create Project" $projectResult)) { $allPassed = $false }
    
    if ($projectResult.project) {
        $projectId = $projectResult.project.id
        Write-Host "  Project ID: $projectId" -ForegroundColor DarkGray
        
        Write-Host "  Approving Project..." -ForegroundColor Gray
        $approveBody = @{ status = "Approved" } | ConvertTo-Json
        $approveResult = Invoke-Api -Method Put -Path "/projects/$projectId/status" -Body $approveBody -Token $adminToken
        if (-not (Show-Result "Approve Project" $approveResult)) { $allPassed = $false }
    }
    else {
        Write-Host "  [SKIP] Approval - Project creation failed" -ForegroundColor Yellow
        $projectId = $null
        $allPassed = $false
    }
}
else {
    Write-Host "  [SKIP] Project tests - Missing tokens" -ForegroundColor Yellow
    $projectId = $null
    $allPassed = $false
}

Write-Host ""

# ============================================
# 3. ASSIGNMENT / ORDER ACTIONS
# ============================================
Write-Host "[3] ASSIGNMENT / ORDER ACTIONS" -ForegroundColor Yellow

if ($projectId -and $adminToken -and $ownerToken) {
    Write-Host "  Proposing Engineer..." -ForegroundColor Gray
    $proposeBody = @{
        projectId = $projectId
        professionalId = 2
    } | ConvertTo-Json
    $proposeResult = Invoke-Api -Method Post -Path "/assignments/propose" -Body $proposeBody -Token $adminToken
    if (-not (Show-Result "Propose Engineer" $proposeResult)) { $allPassed = $false }
    
    if ($proposeResult.assignment) {
        $assignmentId = $proposeResult.assignment.id
        Write-Host "  Assignment ID: $assignmentId" -ForegroundColor DarkGray
        
        Write-Host "  Accepting Assignment..." -ForegroundColor Gray
        $acceptResult = Invoke-Api -Method Post -Path "/assignments/$assignmentId/accept" -Token $ownerToken
        if (-not (Show-Result "Accept Assignment" $acceptResult)) { $allPassed = $false }
    }
    else {
        Write-Host "  [SKIP] Accept - Proposal failed" -ForegroundColor Yellow
        $allPassed = $false
    }
}
else {
    Write-Host "  [SKIP] Assignment tests - Missing project or tokens" -ForegroundColor Yellow
    $allPassed = $false
}

Write-Host ""

# ============================================
# 4. REPORTS & NOTIFICATIONS
# ============================================
Write-Host "[4] REPORTS & NOTIFICATIONS" -ForegroundColor Yellow

if ($engineerToken -and $projectId) {
    Write-Host "  Submitting Progress Report..." -ForegroundColor Gray
    $reportBody = @{
        projectId = "$projectId"
        summary = "Foundation work completed successfully via API test."
    } | ConvertTo-Json
    $reportResult = Invoke-Api -Method Post -Path "/reports/submit" -Body $reportBody -Token $engineerToken
    if (-not (Show-Result "Submit Report" $reportResult)) { $allPassed = $false }
}
else {
    Write-Host "  [SKIP] Report submission - Missing engineer token or project" -ForegroundColor Yellow
    $allPassed = $false
}

if ($ownerToken) {
    Write-Host "  Fetching Notifications..." -ForegroundColor Gray
    $notifResult = Invoke-Api -Method Get -Path "/notifications" -Token $ownerToken
    if (-not (Show-Result "Fetch Notifications" $notifResult)) { $allPassed = $false }
}
else {
    Write-Host "  [SKIP] Notifications - Missing owner token" -ForegroundColor Yellow
    $allPassed = $false
}

if ($adminToken) {
    Write-Host "  Fetching Verified Professionals..." -ForegroundColor Gray
    $profResult = Invoke-Api -Method Get -Path "/users/professionals/verified" -Token $adminToken
    if (-not (Show-Result "Fetch Verified Professionals" $profResult)) { $allPassed = $false }
}
else {
    Write-Host "  [SKIP] Verified Professionals - Missing admin token" -ForegroundColor Yellow
    $allPassed = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL TESTS PASSED" -ForegroundColor Green
}
else {
    Write-Host "  SOME TESTS FAILED" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
