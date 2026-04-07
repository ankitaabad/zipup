local cjson = require "cjson.safe"
local internal_routes = require "internal_routes"

local routes_dict = ngx.shared.routes
local whitelist_domains_dict = ngx.shared.whitelist_domains
ngx.log(ngx.INFO, "Reload endpoint hit")

-- Fetch routes
local routes, routes_err = internal_routes.fetch_routes()
if not routes then
    ngx.log(ngx.ERR, "failed to fetch routes: ", routes_err)
    ngx.status = 500
    ngx.say("failed to fetch routes")
    return
end

-- Fetch whitelist domains
local domains, domains_err = internal_routes.fetch_domain_whitelist()
if not domains then
    ngx.log(ngx.ERR, "failed to fetch whitelist domains: ", domains_err)
    ngx.status = 500
    ngx.say("failed to fetch whitelist domains")
    return
end

-- Encode both first (avoid partial writes)
local routes_json, routes_encode_err = cjson.encode(routes)
if not routes_json then
    ngx.log(ngx.ERR, "failed to encode routes: ", routes_encode_err)
    ngx.status = 500
    ngx.say("failed to encode routes")
    return
end

local domains_json, domains_encode_err = cjson.encode(domains)

-- print domains_json
ngx.log(ngx.INFO, "Fetched whitelist domains: ", domains_json)
if not domains_json then
    ngx.log(ngx.ERR, "failed to encode domains: ", domains_encode_err)
    ngx.status = 500
    ngx.say("failed to encode domains")
    return
end

-- Store in shared dict
local ok1, err1 = routes_dict:set("routes", routes_json)
if not ok1 then
    ngx.log(ngx.ERR, "failed to update routes in shared dict: ", err1)
    ngx.status = 500
    ngx.say("failed to update routes")
    return
end

local ok2, err2 = whitelist_domains_dict:set("domains", domains_json)
if not ok2 then
    ngx.log(ngx.ERR, "failed to update domains in shared dict: ", err2)
    ngx.status = 500
    ngx.say("failed to update domains")
    return
end

ngx.log(ngx.INFO, "Reload successful. Routes: ", #routes, ", Domains: ", #domains)
ngx.say("Routes and domains reloaded successfully")