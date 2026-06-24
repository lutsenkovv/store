import csv
import json
import os

# Вказуємо твої актуальні файли (як на скріншотах)
csv_file_path = 'товари.csv'
json_file_path = 'products.json' # Сайт шукає саме цю назву!

def generate_json_from_csv():
    # Перевіряємо, чи існує CSV файл
    if not os.path.exists(csv_file_path):
        print(f"❌ Помилка: Файл {csv_file_path} не знайдено!")
        return

    products = []

    try:
        # utf-8-sig прибирає невидимі символи від Excel, delimiter=';' каже Python читати крапку з комою
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as csv_file:
            reader = csv.DictReader(csv_file, delimiter=';')
            
            for row in reader:
                # Конвертуємо ціну, навіть якщо в Excel вона написана через кому (45,0 замість 45.0)
                try:
                    price_str = row['price'].replace(',', '.')
                    row['price'] = float(price_str)
                except ValueError:
                    row['price'] = 0.0 
                
                # Конвертуємо рядки в логічні значення
                row['isCustomizable'] = row['isCustomizable'].strip().lower() == 'true'
                row['inStock'] = row['inStock'].strip().lower() == 'true'
                
                products.append(row)

        # Записуємо дані у JSON файл
        with open(json_file_path, mode='w', encoding='utf-8') as json_file:
            json.dump(products, json_file, ensure_ascii=False, indent=2)

        print(f"✅ Успіх! Згенеровано базу на {len(products)} товарів у файлі {json_file_path}.")

    except Exception as e:
        print(f"❌ Виникла помилка під час обробки: {e}")

if __name__ == "__main__":
    generate_json_from_csv()