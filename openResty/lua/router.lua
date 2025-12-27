-- router.lua
local cjson = require "cjson.safe"
-- local http = require "resty.http"
local dict = ngx.shared.routes

local host = ngx.var.host
local uri = ngx.var.uri

ngx.log(ngx.INFO, "Incoming request: ", host, " ", uri)

-- Fetch routes from shared dict
local routes_json = dict:get("routes")
if not routes_json then
    ngx.status = 500
    ngx.say("No routing configuration found")
    return
end

local routes = cjson.decode(routes_json)
if not routes then
    ngx.status = 500
    ngx.say("Invalid routing configuration")
    return
end

-- Find the longest matching path for the host
local matched_route
local max_path_len = 0
for _, route in ipairs(routes) do
    if route.host == host or route.host == "*" then
        if uri:sub(1, #route.path) == route.path then
            if #route.path > max_path_len then
                matched_route = route
                max_path_len = #route.path
            end
        end
    end
end

if not matched_route then
    ngx.status = 404
    ngx.say("Route not found")
    return
end

-- Optional authentication check
if matched_route.auth_required then
    -- Example: Check for access_token in headers or cookies
    local token = ngx.var.http_authorization or ngx.var.cookie_access_token
    if not token then
        ngx.status = 401
        ngx.say("Authentication required")
        return
    end
    -- TODO: Verify token with Passup server
end

-- Handle static routes
if matched_route.type == "static" then
    -- Convert absolute root to internal path
    local relative = matched_route.root:gsub("/data/sites", "")
    ngx.exec("/static" .. relative .. uri)

-- Handle dynamic routes
elseif matched_route.type == "dynamic" then
    -- Use proxy_pass for now (can later switch to Lua HTTP client)
    ngx.var.upstream = matched_route.upstream
    ngx.exec("@dynamic_proxy")

else
    ngx.status = 500
    ngx.say("Invalid route type")
end
