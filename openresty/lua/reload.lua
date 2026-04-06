local cjson = require "cjson.safe"
local internal_routes = require "internal_routes"

local dict = ngx.shared.routes

ngx.log(ngx.INFO, "Reload endpoint hit")

local routes, err = internal_routes.fetch_routes()

if not routes then
    ngx.log(ngx.ERR, err)
    ngx.status = 500
    ngx.say("failed to fetch routes")
    return
end

local ok, set_err = dict:set("routes", cjson.encode(routes))
if not ok then
    ngx.log(ngx.ERR, "failed to update shared dict: ", set_err)
    ngx.status = 500
    ngx.say("failed to update routes")
    return
end

ngx.log(ngx.INFO, "Routes successfully reloaded. Total routes: ", #routes)
ngx.say("Routes reloaded successfully")