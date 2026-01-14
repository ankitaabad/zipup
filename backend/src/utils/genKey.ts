import { V4 } from "paseto";
const localKey = V4.generateKey("public", { format: "paserk" }).then((a) => {
	console.log(a.publicKey);
	console.log(a.secretKey);
});

const payload = {
	email: "user@example.com",
	iat: new Date().toISOString(), // optional: issued-at
	exp: new Date(Date.now() + 1000 * 2).toISOString() // optional: 1-hour expiry
};
// V4.sign(
// 	payload,
// 	"k4.secret.oAKOm1DeWTvvpUK26zwaDgjvXszxKa24rpbyT54SqL_a_tRnMtwZFkktStAwF1XvuaD8A3dlssrQZ-Zn0oVBZA"
// ).then((r) => {
// 	console.log({ r });
// });

// V4.verify(
// 	"v4.public.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOiIyMDI1LTA0LTE4VDA5OjI0OjE3LjQ2OVoiLCJleHAiOiIyMDI1LTA0LTE4VDA5OjI0OjE5LjQ2OVoifTfD4nGH_18clCvS9ErzbC3HBL9cl0SGQrfj1mjKfmgLSAjIWyryzODTycX_chbVbzPDK7hw-z8BZ319602M1gg",
// 	"k4.public.2v7UZzLcGRZJLUrQMBdV77mg_AN3ZbLK0GfmZ9KFQWQ"
// ).then((r) => {
// 	console.log({ r });
// });
