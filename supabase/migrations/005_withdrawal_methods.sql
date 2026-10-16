alter table withdrawals drop constraint if exists withdrawals_method_check;
alter table withdrawals add constraint withdrawals_method_check check(method in ('jazzcash','easypaisa','bank','sadapay','nayapay'));
