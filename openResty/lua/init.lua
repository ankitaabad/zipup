-- init.lua
local cjson = require "cjson.safe"
local dict = ngx.shared.routes

local function load_routes()
    -- Open the routes.json file
    local f = io.open("/config/routes.json", "r")
    if not f then
        ngx.log(ngx.ERR, "routes.json not found at /config/routes.json")
        return
    end

    local data = f:read("*a")
    f:close()

    -- Decode JSON
    local decoded = cjson.decode(data)
    if not decoded or not decoded.routes then
        ngx.log(ngx.ERR, "invalid JSON in routes.json or missing 'routes' key")
        return
    end

    -- Store entire routes array under key "routes" in shared dict
    local ok, err = dict:set("routes", cjson.encode(decoded.routes))
    if not ok then
        ngx.log(ngx.ERR, "failed to set routes in shared dict: ", err)
        return
    end

    ngx.log(ngx.NOTICE, "routes loaded successfully, total routes: ", #decoded.routes)
end

load_routes()
