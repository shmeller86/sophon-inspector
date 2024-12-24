import sqlite3
from tabulate import tabulate  # Убедитесь, что библиотека tabulate установлена
import argparse


def fetch_visit_statistics():
    query = """
    SELECT 
        strftime('%d-%m-%Y %H', timestamp) AS time_group,
        COUNT(*) AS visit_count
    FROM visits
    GROUP BY time_group
    ORDER BY time_group ASC;
    """
    try:
        conn = sqlite3.connect("sophon.db")
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()
        return rows
    except sqlite3.Error as e:
        print(f"Ошибка при работе с базой данных: {e}")
        return []


def fetch_all_visits():
    query = """
    SELECT 
        id, ip, path, timestamp
    FROM visits
    ORDER BY timestamp ASC;
    """
    try:
        conn = sqlite3.connect("sophon.db")
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()
        return rows
    except sqlite3.Error as e:
        print(f"Ошибка при работе с базой данных: {e}")
        return []


def display_statistics():
    statistics = fetch_visit_statistics()
    if statistics:
        print(tabulate(statistics, headers=["Time Group (dd-mm-yyyy HH)", "Visits"], tablefmt="grid"))
    else:
        print("Нет данных для отображения или произошла ошибка.")


def display_all_visits():
    visits = fetch_all_visits()
    if visits:
        print(tabulate(visits, headers=["ID", "IP", "Path", "Timestamp"], tablefmt="grid"))
    else:
        print("Нет данных для отображения или произошла ошибка.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Статистика посещений")
    parser.add_argument('--all', action='store_true', help="Показать все записи с IP-адресами")
    parser.add_argument('--summary', action='store_true', help="Показать сводную статистику посещений")
    args = parser.parse_args()

    if args.all:
        display_all_visits()
    elif args.summary:
        display_statistics()
    else:
        parser.print_help()
