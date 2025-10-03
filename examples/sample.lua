-- sample script to obfuscate
local function hello(name)
  print('Hello, '..(name or 'world')..'!')
end

local playerName = 'Player'
hello(playerName)
