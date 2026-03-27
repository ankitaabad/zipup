local cjson = require "cjson.safe"
local http = require "resty.http"

local dict = ngx.shared.routes
local ROUTES_API = "http://zipup:8080/api/__zipup_internal__/routes"

ngx.log(ngx.INFO, "Reload endpoint hit")

local httpc = http.new()
httpc:set_timeout(3000)

local res, err = httpc:request_uri(ROUTES_API, {
    method = "GET",
    headers = {
        ["Zipup-Internal-Source"] = "openresty"
    }
})

if not res then
    ngx.log(ngx.ERR, "failed to call routes API: ", err)
    ngx.status = 500
    ngx.say("failed to fetch routes")
    return
end

if res.status ~= 200 then
    ngx.log(ngx.ERR, "routes API returned non-200: ", res.status)
    ngx.status = 500
    ngx.say("invalid routes response")
    return
end

local decoded, decode_err = cjson.decode(res.body)
if not decoded or not decoded.routes then
    ngx.log(ngx.ERR, "invalid routes response: ", decode_err)
    ngx.status = 500
    ngx.say("invalid routes payload")
    return
end

local ok, set_err = dict:set("routes", cjson.encode(decoded.routes))
if not ok then
    ngx.log(ngx.ERR, "failed to update shared dict: ", set_err)
    ngx.status = 500
    ngx.say("failed to update routes")
    return
end

ngx.log(ngx.INFO, "Routes successfully reloaded. Total routes: ", #decoded.routes)
ngx.say("Routes reloaded successfully")