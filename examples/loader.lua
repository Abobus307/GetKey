-- Пример загрузчика (роблокс) — использует HttpService
local HttpService = game:GetService('HttpService')
local key = 'ВАШ_КЛЮЧ'
local server = 'https://your-deploy.example.com'

local function validate(key)
  local ok, res = pcall(function()
    return HttpService:PostAsync(server..'/api/validate-key', HttpService:JSONEncode({ key = key }), Enum.HttpContentType.ApplicationJson)
  end)
  if not ok then return false end
  local data = HttpService:JSONDecode(res)
  return data.ok == true
end

if validate(key) then
  print('key valid')
else
  error('invalid key')
end
