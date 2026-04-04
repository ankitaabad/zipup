-- router.lua
local cjson = require "cjson.safe"
local dict = ngx.shared.routes

local host = ngx.var.host
if host == "0.0.0.0" then
    host = "localhost"
end

local uri = ngx.var.uri

ngx.log(ngx.INFO, "==== Incoming request ====")
ngx.log(ngx.INFO, "Host: ", host, " | URI: ", uri)

-- Fetch routes from shared dict
local routes_json = dict:get("routes")
if not routes_json then
    ngx.log(ngx.ERR, "No routing configuration found in shared dict")
    ngx.status = 500
    ngx.say("No routing configuration found")
    return
end

local routes = cjson.decode(routes_json)
if not routes then
    ngx.log(ngx.ERR, "Failed to decode routing JSON")
    ngx.status = 500
    ngx.say("Invalid routing configuration")
    return
end

ngx.log(ngx.INFO, "Loaded ", #routes, " routes from shared dict")

-- Longest prefix match
local matched_route
local max_path_len = 0

for i, route in ipairs(routes) do
    ngx.log(ngx.INFO, "Checking route #", i, ": host=", route.host, " path=", route.path)

    if route.host == host then
        if uri:sub(1, #route.path) == route.path then
            if #route.path > max_path_len then
                matched_route = route
                max_path_len = #route.path
                ngx.log(ngx.INFO, "Matched route updated to #", i, " with path length ", max_path_len)
            end
        end
    end
end

-- fallback
if not matched_route then
    ngx.log(ngx.WARN, "No route matched, falling back to default zipup")

    local args = ngx.var.is_args .. (ngx.var.args or "")
    ngx.var.upstream = "http://zipup:8080"
    ngx.var.upstream_uri = uri .. args

    ngx.exec("@dynamic_proxy")
    return
end

ngx.log(ngx.INFO, "Final matched route: host=", matched_route.host, " path=", matched_route.path, " type=", matched_route.type)

-- auth
if matched_route.auth_required then
    ngx.log(ngx.INFO, "Authentication required for this route")

    local token = ngx.var.http_authorization or ngx.var.cookie_access_token
    if not token then
        ngx.log(ngx.WARN, "Authentication token missing")
        ngx.status = 401
        ngx.say("Authentication required")
        return
    end
end

-- 🔥 PATH STRIPPING
local route_path = matched_route.path
local suffix = uri:sub(#route_path + 1)

if suffix == "" or suffix == nil then
    suffix = "/"
elseif suffix:sub(1, 1) ~= "/" then
    suffix = "/" .. suffix
end

-- ✅ REQUIRED: preserve query string
local args = ngx.var.is_args .. (ngx.var.args or "")
local final_uri = suffix .. args

ngx.log(ngx.INFO, "Computed upstream URI: '", final_uri, "'")

-- STATIC
if matched_route.type == "static" then
    local artifact_id = matched_route.artifact_id

    if not artifact_id or artifact_id == "" then
        ngx.log(ngx.WARN, "Static route has no artifact_id configured")
        ngx.status = 404
        ngx.say("No artifact deployments available for this route")
        return
    end

    ngx.log(ngx.INFO, "Serving static artifact_id: ", artifact_id)

    local internal_path = "/static/" .. artifact_id .. final_uri
    ngx.log(ngx.INFO, "Internal redirect to: ", internal_path)

    ngx.exec(internal_path)

-- DYNAMIC
elseif matched_route.type == "dynamic" then
    ngx.log(ngx.INFO, "Serving dynamic route via upstream: ", matched_route.upstream)

    ngx.var.upstream = matched_route.upstream
    ngx.var.upstream_uri = final_uri  -- ✅ includes query params

    ngx.exec("@dynamic_proxy")

else
    ngx.log(ngx.ERR, "Invalid route type: ", tostring(matched_route.type))
    ngx.status = 500
    ngx.say("Invalid route type")
end