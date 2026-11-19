/**
 * The API has no fee quote endpoint. Deposits and transfers carry no fee field,
 * and `Withdrawal.feesAmount` (server/.../withdrawal/entity/Withdrawal.java)
 * defaults to zero and is never set, so Sutura charges no fee today. Review
 * screens show this as an explicit zero in the operation's own currency.
 * Replace with the server quote when one exists; never estimate a fee here.
 */
export const SUTURA_FEE = 0;
