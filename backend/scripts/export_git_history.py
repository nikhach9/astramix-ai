"""Export real author and committer timestamps without rewriting Git history."""
import argparse
import csv
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='CSV destination outside the tracked source tree.')
    parser.add_argument('--ref', default='HEAD', help='A branch, tag or commit; defaults to HEAD.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    history = subprocess.check_output(['git', 'log', '--date=iso-strict', '--reverse',
        '--format=%H%x00%aI%x00%cI%x00%an%x00%s', args.ref], cwd=root, text=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.writer(stream)
        writer.writerow(['sha', 'author_date', 'committer_date', 'author', 'subject'])
        for line in history.splitlines():
            writer.writerow(line.split(chr(0), 4))
    print(f'Exported {len(history.splitlines())} commits to {args.output}')


if __name__ == '__main__':
    main()
