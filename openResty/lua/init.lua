-- init.lua
local cjson = require "cjson.safe"
local dict = ngx.shared.routes

local function load_routes()
    local f = io.open("/config/routes.json", "r")
    if not f then
        ngx.log(ngx.ERR, "routes.json not found")
        return
    end

    local data = f:read("*a")
    f:close()

    local routes = cjson.decode(data)
    if not routes then
        ngx.log(ngx.ERR, "invalid JSON in routes.json")
        return
    end

    dict:flush_all()

    for host, paths in pairs(routes) do
        for path, cfg in pairs(paths) do
            dict:set(host .. path, cjson.encode(cfg))
        end
    end

    ngx.log(ngx.NOTICE, "routes loaded successfully")
end

load_routes()
