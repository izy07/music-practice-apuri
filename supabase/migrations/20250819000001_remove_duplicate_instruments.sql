-- 重複した楽器データ（小文字のname_en）を削除

DELETE FROM instruments WHERE name_en IN (
  'piano', 'guitar', 'violin', 'flute', 'trumpet', 
  'drums', 'saxophone', 'horn', 'clarinet', 'trombone', 
  'cello', 'bassoon', 'oboe', 'harp', 'contrabass', 
  'other', 'tuba'
);

-- 正しい楽器データ（大文字のname_en）のみが残ります

