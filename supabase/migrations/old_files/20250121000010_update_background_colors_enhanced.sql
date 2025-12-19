-- 楽器の背景色をより濃く、色味を強くする
UPDATE instruments SET 
  color_background = '#F0E6D2'  -- より濃いアイボリー
WHERE name = 'ピアノ';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いコーンシルク
WHERE name = 'ギター';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いオールドレース
WHERE name = 'バイオリン';

UPDATE instruments SET 
  color_background = '#E6F3FF'  -- より濃いアリスブルー
WHERE name = 'フルート';

UPDATE instruments SET 
  color_background = '#FFF0E6'  -- より濃いフローラルホワイト
WHERE name = 'トランペット';

UPDATE instruments SET 
  color_background = '#FFE6E6'  -- より濃いスノー
WHERE name = '打楽器';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いクリーム
WHERE name = 'サックス';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いコーンシルク
WHERE name = 'ホルン';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いコーンシルク
WHERE name = 'チェロ';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いオールドレース
WHERE name = 'ヴィオラ';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いコーンシルク
WHERE name = '琴';

UPDATE instruments SET 
  color_background = '#E6F3FF'  -- より濃いアリスブルー
WHERE name = 'シンセサイザー';

UPDATE instruments SET 
  color_background = '#F5E6D3'  -- より濃いコーンシルク
WHERE name = '太鼓';

-- デフォルトテーマも更新
UPDATE instruments SET 
  color_background = '#F5F5F0'  -- より濃いグレー
WHERE name = 'デフォルト' OR name = 'Default';
