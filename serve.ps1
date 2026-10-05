$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:8765/")
$listener.Start()
Write-Host "Serving $root at http://127.0.0.1:8765/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
  $full = Join-Path $root $path
  $res = $ctx.Response
  if (Test-Path $full -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full).ToLower()
    $types = @{
      ".html" = "text/html; charset=utf-8"
      ".css"  = "text/css; charset=utf-8"
      ".js"   = "application/javascript; charset=utf-8"
      ".png"  = "image/png"
      ".jpg"  = "image/jpeg"
      ".svg"  = "image/svg+xml"
    }
    $res.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" })
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
    $msg = [Text.Encoding]::UTF8.GetBytes("Not found")
    $res.OutputStream.Write($msg, 0, $msg.Length)
  }
  $res.Close()
}
