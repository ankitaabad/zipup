-- reload.lua
local cjson = require "cjson.safe"
local dict = ngx.shared.routes

local f = io.open("/config/routes.json", "r")
if not f then
    ngx.status = 500
    ngx.say("routes.json not found")
    return
end

local data = f:read("*a")
f:close()

local routes = cjson.decode(data)
if not routes then
    ngx.status = 400
    ngx.say("invalid JSON")
    return
end

dict:flush_all()

for host, paths in pairs(routes) do
    for path, cfg in pairs(paths) do
        dict:set(host .. path, cjson.encode(cfg))
    end
end

ngx.say("routes reloaded")
ngx.log(ngx.NOTICE, "routes reloaded via /__reload")
