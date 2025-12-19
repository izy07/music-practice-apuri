-- ラ・カンパネラの演奏者を辻井伸行に変更し、表示順を1番目に設定
UPDATE representative_songs
SET famous_performer = '辻井伸行',
    display_order = 1
WHERE title = 'ラ・カンパネラ'
  AND composer = 'フランツ・リスト';

