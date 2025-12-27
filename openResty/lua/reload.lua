local cjson = require "cjson.safe"
local dict = ngx.shared.routes
local config_file = "/config/routes.json"  -- path inside container

ngx.log(ngx.INFO, "Reload endpoint hit")

-- Read config.json
local file, err = io.open(config_file, "r")
if not file then
    ngx.log(ngx.ERR, "Failed to open config file: ", err)
    ngx.status = 500
    ngx.say("Failed to read config")
    return
end

local content = file:read("*a")
file:close()

local config, decode_err = cjson.decode(content)
if not config or not config.routes then
    ngx.log(ngx.ERR, "Failed to parse config: ", decode_err)
    ngx.status = 500
    ngx.say("Invalid config")
    return
end

-- Store routes in shared dict
local ok, set_err = dict:set("routes", cjson.encode(config.routes))
if not ok then
    ngx.log(ngx.ERR, "Failed to update shared dict: ", set_err)
    ngx.status = 500
    ngx.say("Failed to update routes")
    return
end

ngx.log(ngx.INFO, "Routes successfully reloaded. Total routes: ", #config.routes)
ngx.say("Routes reloaded successfully")
