const messages = {
  jsonMessage: JSON.stringify({
    "message": "creating new artifact",
    "requestId": "rq123"
  }),
  stringMessage: "string message"
};

Object.keys(messages).map((key) => {
  const dockerMessage = {
    "log": messages[key],
    "attrs": { "appName": "zipup", "appType": "system" }
  };
  console.log(key, JSON.stringify({ message: JSON.stringify(dockerMessage) }));
});
