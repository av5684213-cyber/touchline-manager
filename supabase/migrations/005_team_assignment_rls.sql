-- 005_team_assignment_rls.sql
-- Takım atama RLS politikasını düzelt — kullanıcı boş takıma ilk kez manager_user_id set edebilsin

-- Eski update policy'i kaldır
DROP POLICY IF EXISTS "manager_update_team" ON teams;

-- Yeni policy: ya mevcut manager_user_id auth.uid() eşit, ya da manager_user_id null (boş takım ilk kez atanıyor)
CREATE POLICY "manager_update_team" ON teams
  FOR UPDATE USING (
    manager_user_id = auth.uid() OR manager_user_id IS NULL
  )
  WITH CHECK (
    manager_user_id = auth.uid()  -- update sonrası mutlaka kendisi olmalı
  );

-- Bilgi amaçlı
SELECT 'team_update_policy_updated' AS status;
