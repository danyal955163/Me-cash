-- Run after migrations. Admin is auto-promoted by handle_new_user when this email signs up:
-- muhammaddanyal4545@gmail.com (set its password in Supabase Auth, never in client code).
insert into tasks(title,title_ur,description,description_ur,reward,reward_coins,proof_type,slots,status) values
('Share our page on Facebook','Facebook پر ہمارا page share کریں','Share the official Me Cash page.','آفیشل Me Cash page share کریں۔',20,20000,'screenshot',100,'active'),
('Post our link on TikTok','TikTok پر link post کریں','Create a TikTok post with our link.','ہمارے link کے ساتھ TikTok post بنائیں۔',30,30000,'link',100,'active'),
('Follow our Instagram','Instagram follow کریں','Follow the official account.','آفیشل account follow کریں۔',15,15000,'screenshot',100,'active'),
('Invite 5 friends','5 دوست invite کریں','Invite five new earners.','پانچ نئے earners invite کریں۔',100,100000,'any',100,'active'),
('Write a Google review','Google review لکھیں','Leave an honest review.','ایک سچا review لکھیں۔',50,50000,'text',100,'active');
