import { test, expect } from '@playwright/test';

test.describe('Visual Snapshot - deleteConnection baseline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Canvas antes e depois da deleção deve corresponder ao baseline', async ({ page }) => {
    // Aguardar canvas carregar
    await page.waitForSelector('canvas', { timeout: 5000 });
    
    // Screenshot antes
    const before = await page.screenshot({ fullPage: true });
    
    // Selecionar e deletar uma conexão
    // Nota: Ajustar seletor baseado na implementação real
    const connection = page.locator('.connection-line').first();
    if (await connection.count() > 0) {
      await connection.click();
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);
    }
    
    // Screenshot depois
    const after = await page.screenshot({ fullPage: true });
    
    // Verificar que houve mudança visual
    expect(after).not.toEqual(before);
    
    // Comparar com snapshot baseline
    await expect(page).toHaveScreenshot('deleteConnection-after.png', {
      maxDiffPixels: 100,
    });
  });

  test('Nós permanecem visíveis após deletar conexão', async ({ page }) => {
    await page.waitForSelector('canvas');
    
    const nodesBefore = await page.locator('[data-node-id]').count();
    
    // Deletar uma conexão (se existir)
    const connection = page.locator('.connection-line').first();
    if (await connection.count() > 0) {
      await connection.click();
      await page.keyboard.press('Delete');
      await page.waitForTimeout(300);
    }
    
    const nodesAfter = await page.locator('[data-node-id]').count();
    
    // Nós devem permanecer
    expect(nodesAfter).toBe(nodesBefore);
  });

  test('ViewMode não muda ao deletar conexão', async ({ page }) => {
    await page.waitForSelector('canvas');
    
    // Capturar viewMode antes (pode ser através de um data attribute)
    const viewModeBefore = await page.evaluate(() => {
      return document.body.getAttribute('data-view-mode') || 'unknown';
    });
    
    // Deletar conexão
    const connection = page.locator('.connection-line').first();
    if (await connection.count() > 0) {
      await connection.click();
      await page.keyboard.press('Delete');
      await page.waitForTimeout(300);
    }
    
    const viewModeAfter = await page.evaluate(() => {
      return document.body.getAttribute('data-view-mode') || 'unknown';
    });
    
    expect(viewModeAfter).toBe(viewModeBefore);
  });
});
