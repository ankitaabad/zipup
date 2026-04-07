-- internal_utils.lua
local _M = {}
local cjson = require "cjson.safe"
-- Normalize host (lowercase + strip port)
function _M.normalize_host(host)
    if not host then return nil end
    host = string.lower(host)
    host = host:gsub(":%d+$", "") -- remove port
    return host
end

-- Check if host is IP (IPv4 + basic IPv6)
function _M.is_ip(host)
    if not host then return false end

    -- IPv4
    if string.match(host, "^%d+%.%d+%.%d+%.%d+$") then
        return true
    end

    -- IPv6 (basic check)
    if string.find(host, ":") then
        return true
    end

    return false
end



function _M.is_whitelisted_domain(host)
    if not host then
        return false
    end

    host = string.lower(host):gsub(":%d+$", "")

    local dict = ngx.shared.whitelist_domains
    local domains_json = dict:get("domains")
    if not domains_json then
        return false
    end

    local domains = cjson.decode(domains_json)
    if not domains then
        return false
    end

    for _, domain in ipairs(domains) do
        if domain == host then
            return true
        end
    end

    return false
end

-- Environment helper
function _M.is_dev()
    return os.getenv("ENV") == "development"
end

return _M